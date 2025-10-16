import { ChangeEvent } from 'react';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { TagInput } from '../../shared/ui/TagInput';
import styles from './ArticleEditor.module.css';

type Props = {
    title: string;
    slug: string;
    summary: string;
    tags: string[];
    coverImageUrl: string;
    isCoverUploading: boolean;
    uploadError: string | null;

    onTitleChange: (v: string) => void;
    onSlugChange: (v: string) => void;
    onSummaryChange: (v: string) => void;
    onTagsChange: (v: string[]) => void;

    onCoverChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onCoverRemove: () => void;
};

/**
 * Форма редактирования метаданных статьи: заголовка, slug, описания, тегов и обложки.
 *
 * @param props.title Текущий заголовок статьи.
 * @param props.slug Адресная часть (slug), используемая в URL.
 * @param props.summary Краткое описание для списка статей и SEO.
 * @param props.tags Набор тегов, описывающих статью.
 * @param props.coverImageUrl URL текущей обложки статьи.
 * @param props.isCoverUploading Флаг состояния загрузки изображения.
 * @param props.uploadError Текст ошибки загрузки, если она произошла.
 * @param props.onTitleChange Обработчик изменения заголовка.
 * @param props.onSlugChange Обработчик изменения slug.
 * @param props.onSummaryChange Обработчик изменения краткого описания.
 * @param props.onTagsChange Обработчик изменения списка тегов.
 * @param props.onCoverChange Обработчик выбора файла обложки.
 * @param props.onCoverRemove Обработчик удаления текущей обложки.
 */
export function ArticleMetaForm(props: Props) {
    const {
        title, slug, summary, tags, coverImageUrl, isCoverUploading, uploadError,
        onTitleChange, onSlugChange, onSummaryChange, onTagsChange, onCoverChange, onCoverRemove,
    } = props;

    return (
        <Card className={styles.formCard}>
            <div className={styles.fieldGrid}>
                <Input
                    label="Заголовок"
                    value={title}
                    onChange={e => onTitleChange(e.target.value)}
                    placeholder="Введите заголовок"
                    required
                />
                <Input
                    label="Slug"
                    value={slug}
                    onChange={e => onSlugChange(e.target.value)}
                    placeholder="avtosozdannyi-slug"
                    required
                />
            </div>

            <label className={styles.textareaLabel}>
                <span>Краткое описание</span>
                <textarea
                    className={styles.textarea}
                    value={summary}
                    onChange={e => onSummaryChange(e.target.value)}
                    rows={4}
                    placeholder="Кратко опишите содержание статьи"
                />
            </label>

            <TagInput value={tags} onChange={onTagsChange} label="Теги" />

            <div className={styles.coverSection}>
                <label className={styles.coverLabel}>
                    Обложка
                    <input type="file" accept="image/*" onChange={onCoverChange} disabled={isCoverUploading} />
                </label>
                {isCoverUploading ? <span className={styles.hint}>Загрузка изображения…</span> : null}
                {coverImageUrl ? (
                    <div className={styles.coverPreview}>
                        <img src={coverImageUrl} alt="Обложка статьи" />
                        <Button variant="ghost" onClick={onCoverRemove}>Удалить</Button>
                    </div>
                ) : null}
                {uploadError ? <p className={styles.error}>{uploadError}</p> : null}
            </div>
        </Card>
    );
}
